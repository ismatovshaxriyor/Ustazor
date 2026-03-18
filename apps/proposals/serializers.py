from rest_framework import serializers

from apps.jobs.models import ORDER_STATUS_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal


class VacancyProposalCreateSerializer(serializers.ModelSerializer):
    vacancy_id = serializers.IntegerField(source='vacancy.id', read_only=True)
    vacancy_title = serializers.CharField(source='vacancy.title', read_only=True)

    class Meta:
        model = VacancyProposal
        fields = (
            'id',
            'vacancy_id',
            'vacancy_title',
            'cover_letter',
            'proposed_price',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'vacancy_id', 'vacancy_title', 'status', 'created_at', 'updated_at')

    def validate_proposed_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Taklif narxi 0 dan katta bo`lishi kerak.")
        return value

    def validate(self, attrs):
        request = self.context['request']
        vacancy = self.context['vacancy']

        if vacancy.status != ORDER_STATUS_CHOICES.open:
            raise serializers.ValidationError("Bu e`lon yopilgan, unga murojaat yuborib bo`lmaydi.")

        already_applied = VacancyProposal.objects.filter(vacancy=vacancy, worker=request.user).exists()
        if already_applied:
            raise serializers.ValidationError("Siz bu e`longa allaqachon murojaat yuborgansiz.")

        return attrs

    def create(self, validated_data):
        return VacancyProposal.objects.create(
            vacancy=self.context['vacancy'],
            worker=self.context['request'].user,
            **validated_data,
        )


class VacancyProposalSerializer(serializers.ModelSerializer):
    vacancy_id = serializers.IntegerField(source='vacancy.id', read_only=True)
    vacancy_title = serializers.CharField(source='vacancy.title', read_only=True)
    vacancy_city = serializers.CharField(source='vacancy.city', read_only=True)
    client_name = serializers.CharField(source='vacancy.client.full_name', read_only=True)
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)

    class Meta:
        model = VacancyProposal
        fields = (
            'id',
            'vacancy_id',
            'vacancy_title',
            'vacancy_city',
            'client_name',
            'worker_name',
            'cover_letter',
            'proposed_price',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class ProposalStatusUpdateSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=(
            PROPOSAL_STATUS_CHOICES.accepted,
            PROPOSAL_STATUS_CHOICES.rejected,
        )
    )

    class Meta:
        model = VacancyProposal
        fields = ('status',)
