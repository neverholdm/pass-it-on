from rest_framework import serializers


class DemoIdentityRequestSerializer(serializers.Serializer):
    identity = serializers.ChoiceField(choices=("giver", "applicant"))


class DemoIdentityUserSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    display_name = serializers.CharField()


class DemoIdentityResponseSerializer(serializers.Serializer):
    identity = serializers.CharField()
    user = DemoIdentityUserSerializer()


class DemoItemCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, allow_blank=False)
    category = serializers.CharField(max_length=100, allow_blank=False)
    description = serializers.CharField(allow_blank=False)


class DemoItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    category = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    owner = serializers.CharField()
    is_free = serializers.BooleanField()
    can_apply = serializers.BooleanField()


class DemoCommentCreateSerializer(serializers.Serializer):
    item = serializers.UUIDField()
    body = serializers.CharField(allow_blank=False)


class DemoCommentSerializer(serializers.Serializer):
    id = serializers.CharField()
    body = serializers.CharField()
    author = serializers.CharField()
    created_at = serializers.DateTimeField()


class DemoItemDetailsSerializer(DemoItemSerializer):
    comments = DemoCommentSerializer(many=True)


class DemoApplySerializer(serializers.Serializer):
    id = serializers.CharField()
    status = serializers.CharField()


class DemoBookingSerializer(serializers.Serializer):
    id = serializers.CharField()
    item = DemoItemSerializer()
    applicant = serializers.CharField()
    applicant_id = serializers.CharField()
    status = serializers.CharField()
    status_code = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class DemoActivitySerializer(serializers.Serializer):
    identity = serializers.CharField()
    items = DemoItemSerializer(many=True)
    applications = DemoBookingSerializer(many=True)
    received = DemoBookingSerializer(many=True)


class DemoImpactSerializer(serializers.Serializer):
    simulated = serializers.BooleanField()
    completed_giveaways = serializers.IntegerField()
    participants = serializers.IntegerField()


class DemoResetSerializer(serializers.Serializer):
    reset = serializers.BooleanField()
