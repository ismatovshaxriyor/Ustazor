from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.jobs.models import ORDER_STATUS_CHOICES
from apps.reviews.models import (
    WorkerPortfolio,
    WorkerPortfolioImage,
    WorkerReview,
    WorkerReviewImage,
)


class WorkerReviewImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = WorkerReviewImage
        fields = (
            'id',
            'image_url',
            'created_at',
        )
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_image_url(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return ''
        try:
            url = obj.image.url
        except ValueError:
            return ''
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class WorkerReviewPublicSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    images = WorkerReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = WorkerReview
        fields = (
            'id',
            'order_id',
            'client_name',
            'worker_name',
            'rating',
            'comment',
            'images',
            'created_at',
        )
        read_only_fields = fields


class WorkerReviewCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = WorkerReview
        fields = (
            'id',
            'rating',
            'comment',
            'images',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def validate_comment(self, value):
        return value.strip()

    def validate(self, attrs):
        request = self.context['request']
        order = self.context['order']

        if order.client_id != request.user.id:
            raise serializers.ValidationError("Siz faqat o`zingizning e`loningizga baho bera olasiz.")

        if order.status != ORDER_STATUS_CHOICES.completed:
            raise serializers.ValidationError("Baho berish uchun e`lon holati yakunlangan bo`lishi kerak.")

        if not order.assigned_worker_id:
            raise serializers.ValidationError("Usta biriktirilmagan e`longa baho berib bo`lmaydi.")

        if hasattr(order, 'worker_review'):
            raise serializers.ValidationError("Bu e`lon uchun baho allaqachon kiritilgan.")

        return attrs

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        validated_data.pop('clear_images', None)
        request = self.context['request']
        order = self.context['order']

        with transaction.atomic():
            review = WorkerReview.objects.create(
                order=order,
                client=request.user,
                worker=order.assigned_worker,
                **validated_data,
            )
            for image in images:
                WorkerReviewImage.objects.create(review=review, image=image)
        return review


class WorkerPortfolioImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = WorkerPortfolioImage
        fields = (
            'id',
            'image_url',
            'created_at',
        )
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_image_url(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return ''
        try:
            url = obj.image.url
        except ValueError:
            return ''
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class WorkerPortfolioPublicSerializer(serializers.ModelSerializer):
    images = WorkerPortfolioImageSerializer(many=True, read_only=True)

    class Meta:
        model = WorkerPortfolio
        fields = (
            'id',
            'title',
            'description',
            'location',
            'completed_at',
            'is_featured',
            'images',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class WorkerPortfolioCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )
    clear_images = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model = WorkerPortfolio
        fields = (
            'id',
            'title',
            'description',
            'location',
            'completed_at',
            'is_featured',
            'images',
            'clear_images',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_title(self, value):
        clean_value = value.strip()
        if not clean_value:
            raise serializers.ValidationError("Ish sarlavhasi bo`sh bo`lishi mumkin emas.")
        return clean_value

    def validate_description(self, value):
        return value.strip()

    def validate_location(self, value):
        return value.strip()

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        validated_data.pop('clear_images', None)
        request = self.context['request']

        with transaction.atomic():
            portfolio = WorkerPortfolio.objects.create(
                worker=request.user,
                **validated_data,
            )
            for image in images:
                WorkerPortfolioImage.objects.create(portfolio=portfolio, image=image)
        return portfolio

    def update(self, instance, validated_data):
        images = validated_data.pop('images', None)
        clear_images = validated_data.pop('clear_images', False)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if clear_images:
                instance.images.all().delete()

            if images:
                for image in images:
                    WorkerPortfolioImage.objects.create(portfolio=instance, image=image)
        return instance
