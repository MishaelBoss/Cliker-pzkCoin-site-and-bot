from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    telegram_id = models.BigIntegerField(unique=True, null=True, blank=True)
    coins = models.IntegerField(default=0)

class Product(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='created_products')
    title = models.CharField(max_length=150)
    image = models.ImageField(upload_to='images')
    price = models.IntegerField(default=0)
    discount = models.IntegerField(default=0)
    isPercent = models.BooleanField(default=True)

class Basket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='basket_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product')
    count = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)