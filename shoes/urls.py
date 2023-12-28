from django.urls import path
from . import views

app_name = 'shoes'

#domain.com/shoes/
urlpatterns =[
    path('table/', views.table_view, name='table'),
    path('shoe/<int:pk>/', views.ShoeDetail.as_view(), name='shoe_detail'),
]