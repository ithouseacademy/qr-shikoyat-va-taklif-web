from rest_framework import serializers
from .models import Feedback, FeedbackAttachment, FeedbackCategory, FeedbackComment, FeedbackStatusHistory


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackCategory
        fields = ['id', 'name', 'kind', 'is_active']


class FeedbackListSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_name = serializers.CharField(source='category.name', default='', read_only=True)
    branch_name = serializers.CharField(source='branch.name', default='', read_only=True)
    department_name = serializers.CharField(source='department.name', default='', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', default='', read_only=True)
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'number', 'type', 'type_display', 'category', 'category_name', 'branch', 'branch_name',
                  'department', 'department_name', 'name', 'phone', 'text', 'rating', 'status', 'status_display',
                  'assigned_to', 'assigned_to_name', 'attachments', 'created_at']

    def get_attachments(self, obj):
        return [a.file.url for a in obj.attachments.all()]


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', default='', read_only=True)

    class Meta:
        model = FeedbackComment
        fields = ['id', 'author', 'author_name', 'text', 'is_internal', 'created_at']
        read_only_fields = ['author']


class HistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', default='', read_only=True)

    class Meta:
        model = FeedbackStatusHistory
        fields = ['id', 'changed_by_name', 'from_status', 'to_status', 'note', 'created_at']


class FeedbackDetailSerializer(FeedbackListSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    history = HistorySerializer(many=True, read_only=True)
    qr_name = serializers.CharField(source='qr.name', default='', read_only=True)

    class Meta(FeedbackListSerializer.Meta):
        fields = FeedbackListSerializer.Meta.fields + ['comments', 'history', 'qr_name', 'resolved_at']


class PublicFeedbackSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=['suggestion', 'complaint', 'rating'])
    category = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    text = serializers.CharField(max_length=3000, required=False, allow_blank=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)

    def validate(self, a):
        from django.utils.html import strip_tags
        for k in ('name', 'phone', 'text'):
            if k in a:
                a[k] = strip_tags(a[k]).strip()
        if a['type'] == 'rating':
            if not a.get('rating'):
                raise serializers.ValidationError({'rating': 'Baho tanlang'})
        else:
            if len(a.get('text', '')) < 5:
                raise serializers.ValidationError({'text': 'Matn kamida 5 ta belgidan iborat bo‘lsin'})
            a['rating'] = None
        return a
