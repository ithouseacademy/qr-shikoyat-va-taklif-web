from django.db import models


class Department(models.Model):
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='departments')
    branch = models.ForeignKey('branches.Branch', null=True, blank=True, on_delete=models.SET_NULL, related_name='departments')
    name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
