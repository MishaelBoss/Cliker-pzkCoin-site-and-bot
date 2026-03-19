from rest_framework import serializers
from .models import Player, RatingHistory

class PlayerSerializer(serializers.ModelSerializer):
    rank = serializers.SerializerMethodField()
    
    class Meta:
        model = Player
        fields = ['name', 'coins', 'clicks', 'level', 'rank', 'last_update']
    
    def get_rank(self, obj):
        return Player.objects.filter(coins__gt=obj.coins).count() + 1

class PlayerUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    telegram_id = serializers.IntegerField(required=False)
    coins = serializers.IntegerField()
    clicks = serializers.IntegerField()
    level = serializers.IntegerField()

class RatingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RatingHistory
        fields = '__all__'