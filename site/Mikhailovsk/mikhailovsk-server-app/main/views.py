from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt
from .models import *
from django.shortcuts import get_object_or_404
from django.db.models import Sum 

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        if user.objects.filter(username = data['username']).exists():
            return JsonResponse({'Такой пользователь есть': user.username});

        user = User.objects.create_user(
                username=data['username'],
                password=data['password']
        )

        profile = Profile.create(user)
        profile.save()

        login(request, user);

        return JsonResponse({'Create user': user.username});
    return JsonResponse({'Error create user': user.username})

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user = authenticate(
            username=data['username'],
            password=data['password']
        )
        if user is not None:
            login(request, user)
            return JsonResponse({'is_authenticated': True, 'username': user.username});
    return JsonResponse({'Error login user': user.username});

def logout_view(request):
    if request.method == 'POST':
        logout(request)
        JsonResponse({'User logout'})
    return JsonResponse({'Error logout'})

def is_login_view(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "is_authenticated": True,
            "username": request.user.username,
            "email": request.user.email
        })
    return JsonResponse({'is_authenticated': False})

def profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    profile = get_object_or_404(Profile, request.user)
    return JsonResponse(profile)

def get_coins_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    
    profile = get_object_or_404(Profile, user=request.user)

    count = profile.coins
    
    return JsonResponse({'coins': count})

def add_product_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    if request.method == 'POST':
        data = json.loads(request.body)
        product = Product.objects.create(
            author = request.user,
            title = data['title'],
            image = data['image'],
            price = data['price'],
            discount = 0,
        )
        product.save()
    return JsonResponse({'message': product.title})

def list_product_view(request):
    products = Product.objects.all()

    data = []

    for p in products:
        data.append({
            "id": p.id,
            "title": p.title,
            "realPrice": p.price,
            "discount": p.discount,
            "isPercent": p.isPercent,
            "image": p.image.url if p.image else "" 
        })
    return JsonResponse(data, safe=False)

@csrf_exempt
def add_to_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    if request.method == 'POST':
        data = json.loads(request.body)
        product = get_object_or_404(Product, id=data['product_id'])

        item, created = Basket.objects.get_or_create(
            user = request.user,
            product = product
        )
        
        if not created: 
            item.count += 1
            item.save()

        return JsonResponse({'message': 'Add to basket product'})
    
@csrf_exempt
def remove_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    if request.method == 'POST':
        data = json.loads(request.body)
        item = Basket.objects.get(user=request.user, product_id=data['product_id'])

        if item.count > 1:
            item.count -= 1
            item.save()
        else:
            item.delete()
    return JsonResponse({'message': 'Add to basket product'})
    
def get_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'}, [], safe=False)
    
    items = Basket.objects.filter(user=request.user)

    data = []

    for b in items:
        data.append({
            "id": b.id,
            "count": b.count,
            "product": {
                "id": b.product.id,
                "title": b.product.title,
                "price": b.product.price,
                "discount": b.product.discount,
                "isPercent": b.product.isPercent,
                "image": b.product.image.url if b.product.image else ""
            }
        })
    return JsonResponse(data, safe=False)

def get_basket_count_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'total_count': 0})

    total = request.user.basket_items.aggregate(total=Sum('count'))['total'] or 0
    
    return JsonResponse({'total_count': total})

def delete_from_basket_view(request, item_id):
    item = get_object_or_404(Basket, id=item_id, user=request.user)
    item.delete()
    return JsonResponse({'message': 'delete'})


def get_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse([], safe=False)

    profile = request.user.profile
    user_coins = profile.coins 
    
    items = Basket.objects.filter(user=request.user)
    data = []

    for b in items:
        product = b.product
        discount = product.discount if user_coins >= 1000 else 0
        
        data.append({
            "id": b.id,
            "count": b.count,
            "product": {
                "id": product.id,
                "title": product.title,
                "price": product.price,
                "discount": discount, 
                "isPercent": product.isPercent,
                "image": product.image.url if product.image else ""
            }
        })
    return JsonResponse(data, safe=False)


@csrf_exempt
def sync_coins_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        tg_id = data.get('telegram_id')
        coins = data.get('coins')

        profile = Profile.objects.filter(telegram_id=tg_id).first()
        
        if profile:
            if coins > profile.coins:
                profile.coins = coins
                profile.save()
            return JsonResponse({'status': 'updated'})
            
    return JsonResponse({'status': 'error'}, status=400)