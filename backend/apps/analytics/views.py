from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.feedback.models import Feedback
from apps.organizations.permissions import ManagerPlus, get_membership
from . import exports, services


class SummaryView(APIView):
    permission_classes = [IsAuthenticated, ManagerPlus]

    def get(self, request):
        return Response(services.summary(get_membership(request).organization))


class ReportView(APIView):
    permission_classes = [IsAuthenticated, ManagerPlus]

    def get(self, request):
        p = request.query_params
        return Response(services.report(get_membership(request).organization, p.get('period', 'daily'), p.get('date_from') or None, p.get('date_to') or None))


class ExportView(APIView):
    permission_classes = [IsAuthenticated, ManagerPlus]

    def get(self, request):
        org = get_membership(request).organization
        p = request.query_params
        fmt = 'pdf' if p.get('format') == 'pdf' else 'xlsx'
        r = services.report(org, p.get('period', 'daily'), p.get('date_from') or None, p.get('date_to') or None)
        sections = {'Davr bo‘yicha': r['series'], 'Nisbat': r['ratio'], 'Filiallar': r['branches'], 'Bo‘limlar': r['departments'],
                    'Shikoyat kategoriyalari': r['top_complaint_categories'], 'Xodimlar': r['staff']}
        if p.get('what') == 'feedbacks':
            qs = Feedback.objects.filter(organization=org).select_related('branch', 'department', 'category', 'assigned_to')
            if p.get('date_from'):
                qs = qs.filter(created_at__date__gte=p['date_from'])
            if p.get('date_to'):
                qs = qs.filter(created_at__date__lte=p['date_to'])
            sections = {'Murojaatlar': [{'Raqam': f.number, 'Turi': f.get_type_display(), 'Kategoriya': f.category.name if f.category else '',
                                         'Filial': f.branch.name if f.branch else '', 'Bo‘lim': f.department.name if f.department else '',
                                         'Holat': f.get_status_display(), 'Baho': f.rating, 'Mas‘ul': f.assigned_to.full_name if f.assigned_to else '',
                                         'Sana': f.created_at.strftime('%Y-%m-%d %H:%M'), 'Matn': f.text[:200]} for f in qs[:5000]]}
        name = f'report-{org.slug}'
        if fmt == 'pdf':
            data, ctype = exports.to_pdf(f'{org.name} — hisobot', sections), 'application/pdf'
        else:
            data, ctype = exports.to_xlsx(sections), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        resp = HttpResponse(data, content_type=ctype)
        resp['Content-Disposition'] = f'attachment; filename="{name}.{fmt}"'
        return resp
