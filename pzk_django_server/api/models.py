from django.db import models

class Player(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    telegram_id = models.BigIntegerField(unique=True, null=True, blank=True)
    coins = models.IntegerField(default=0)
    clicks = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    last_update = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-coins']
    
    def __str__(self):
        return f"{self.name} - {self.coins} coins"

class RatingHistory(models.Model):
    player_name = models.CharField(max_length=100, db_index=True)
    coins = models.IntegerField()
    clicks = models.IntegerField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-recorded_at']