from datetime import timedelta
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from apps.feedback.models import Feedback
from apps.qr_codes.models import QRScan


def _hours(td):
    return round(td.total_seconds() / 3600, 1) if td else None


def summary(org):
    qs = Feedback.objects.filter(organization=org)
    t = qs.aggregate(
        total=Count('id'), new=Count('id', filter=Q(status='new')),
        in_progress=Count('id', filter=Q(status='in_progress')), resolved=Count('id', filter=Q(status='resolved')),
        suggestions=Count('id', filter=Q(type='suggestion')), complaints=Count('id', filter=Q(type='complaint')),
        avg_rating=Avg('rating'))
    t['avg_rating'] = round(t['avg_rating'], 2) if t['avg_rating'] else None

    def daily(days):
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        rows = qs.filter(created_at__date__gte=start).annotate(d=TruncDate('created_at')).values('d', 'type').annotate(c=Count('id'))
        out = {start + timedelta(days=i): {'date': (start + timedelta(days=i)).isoformat(), 'suggestion': 0, 'complaint': 0, 'rating': 0} for i in range(days)}
        for r in rows:
            if r['d'] in out:
                out[r['d']][r['type']] = r['c']
        return list(out.values())

    top = (qs.exclude(branch=None).values('branch__name').annotate(count=Count('id')).order_by('-count')[:5])
    t.update({'last7': daily(7), 'last30': daily(30),
              'top_branches': [{'name': r['branch__name'], 'count': r['count']} for r in top]})
    return t


def report(org, period='daily', date_from=None, date_to=None):
    qs = Feedback.objects.filter(organization=org)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    trunc = {'daily': TruncDate, 'weekly': TruncWeek, 'monthly': TruncMonth}.get(period, TruncDate)
    series = (qs.annotate(p=trunc('created_at')).values('p')
              .annotate(total=Count('id'), suggestions=Count('id', filter=Q(type='suggestion')),
                        complaints=Count('id', filter=Q(type='complaint')), ratings=Count('id', filter=Q(type='rating')))
              .order_by('p'))
    dur = ExpressionWrapper(F('resolved_at') - F('created_at'), output_field=DurationField())
    scans = {r['qr__branch__name']: r['c'] for r in
             QRScan.objects.filter(organization=org).values('qr__branch__name').annotate(c=Count('id'))}
    branches = [{'branch': r['branch__name'] or '—', 'total': r['total'], 'complaints': r['complaints'],
                 'avg_rating': round(r['avg'], 2) if r['avg'] else None, 'scans': scans.get(r['branch__name'], 0)}
                for r in qs.values('branch__name').annotate(total=Count('id'), complaints=Count('id', filter=Q(type='complaint')), avg=Avg('rating')).order_by('-total')]
    return {
        'series': [{'period': r['p'].isoformat() if r['p'] else '', 'total': r['total'], 'suggestions': r['suggestions'],
                    'complaints': r['complaints'], 'ratings': r['ratings']} for r in series],
        'ratio': [{'type': 'Takliflar', 'count': qs.filter(type='suggestion').count()},
                  {'type': 'Shikoyatlar', 'count': qs.filter(type='complaint').count()},
                  {'type': 'Baholar', 'count': qs.filter(type='rating').count()}],
        'branches': branches,
        'departments': [{'department': r['department__name'] or '—', 'total': r['total'], 'complaints': r['complaints']}
                        for r in qs.values('department__name').annotate(total=Count('id'), complaints=Count('id', filter=Q(type='complaint'))).order_by('-total')],
        'top_complaint_categories': [{'category': r['category__name'] or '—', 'count': r['c']}
                                     for r in qs.filter(type='complaint').values('category__name').annotate(c=Count('id')).order_by('-c')[:10]],
        'resolution': {'avg_hours': _hours(qs.filter(resolved_at__isnull=False, status='resolved').aggregate(a=Avg(dur))['a']),
                       'resolved': qs.filter(status='resolved').count()},
        'staff': [{'staff': r['assigned_to__full_name'], 'assigned': r['total'], 'resolved': r['resolved'], 'avg_hours': _hours(r['avg'])}
                  for r in qs.exclude(assigned_to=None).values('assigned_to__full_name')
                  .annotate(total=Count('id'), resolved=Count('id', filter=Q(status='resolved')),
                            avg=Avg(dur, filter=Q(status='resolved'))).order_by('-resolved')],
    }
