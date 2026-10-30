from django.db import transaction
from apps.integrations.tasks import deliver_external
from apps.notifications.services import notify, staff_users


def on_feedback_created(fb):
    ntype = {'suggestion': 'new_suggestion', 'complaint': 'new_complaint', 'rating': 'new_rating'}[fb.type]
    label = {'suggestion': 'Yangi taklif!', 'complaint': 'Yangi shikoyat!', 'rating': 'Yangi baho!'}[fb.type]
    where = ' — '.join(x for x in (fb.organization.name, fb.department.name if fb.department else (fb.branch.name if fb.branch else '')) if x)
    kind = {'suggestion': 'taklif', 'complaint': 'shikoyat', 'rating': 'baho'}[fb.type]

    def _go():
        notify(fb.organization, ntype, label, f'{where}. Mijozdan yangi {kind} kelib tushdi.', staff_users(fb.organization), fb)
        deliver_external.delay(fb.id)
    transaction.on_commit(_go)
