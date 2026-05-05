from rest_framework import serializers

from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES


class JobOrderSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    assigned_worker_name = serializers.CharField(source='assigned_worker.full_name', read_only=True)
    review_id = serializers.IntegerField(source='worker_review.id', read_only=True, allow_null=True)

    class Meta:
        model = JobOrder
        fields = (
            'id',
            'title',
            'description',
            'category',
            'city',
            'address',
            'price_type',
            'price_amount',
            'status',
            'due_date',
            'client',
            'client_name',
            'client_email',
            'assigned_worker',
            'assigned_worker_name',
            'review_id',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'client',
            'client_name',
            'client_email',
            'assigned_worker',
            'assigned_worker_name',
            'review_id',
            'created_at',
            'updated_at',
        )

    def validate_price_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Narx 0 dan katta bo'lishi kerak.")
        return value

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        price_type = attrs.get('price_type', getattr(instance, 'price_type', PRICE_TYPE_CHOICES.negotiable))
        price_amount = attrs.get('price_amount', getattr(instance, 'price_amount', None))
        status = attrs.get('status', getattr(instance, 'status', ORDER_STATUS_CHOICES.open))
        assigned_worker = getattr(instance, 'assigned_worker', None)

        if price_type == PRICE_TYPE_CHOICES.fixed and price_amount is None:
            raise serializers.ValidationError(
                {'price_amount': "Aniq narx rejimida narx kiritilishi shart."}
            )

        if price_type == PRICE_TYPE_CHOICES.negotiable:
            attrs['price_amount'] = None

        if status not in ORDER_STATUS_CHOICES.values:
            raise serializers.ValidationError({'status': "Noto'g'ri status yuborildi."})

        if status == ORDER_STATUS_CHOICES.completed and not assigned_worker:
            raise serializers.ValidationError(
                {'status': "Usta biriktirilmagan e`lonni yakunlash mumkin emas."}
            )

        return attrs


class PublicJobOrderSerializer(serializers.ModelSerializer):
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_phone_number = serializers.CharField(source='client.phone_number', read_only=True)
    client_secondary_phone_number = serializers.CharField(source='client.secondary_phone_number', read_only=True)
    client_telegram_username = serializers.CharField(source='client.telegram_username', read_only=True)
    client_instagram_username = serializers.CharField(source='client.instagram_username', read_only=True)

    class Meta:
        model = JobOrder
        fields = (
            'id',
            'title',
            'description',
            'category',
            'city',
            'address',
            'price_type',
            'price_amount',
            'status',
            'due_date',
            'client_email',
            'client_name',
            'client_phone_number',
            'client_secondary_phone_number',
            'client_telegram_username',
            'client_instagram_username',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields
