from typing import Any
from django.db.models.query import QuerySet
from django.shortcuts import render
from django.http import HttpResponse
from .models import Shoe
from django.views.generic import CreateView, DetailView, ListView
from django.urls import reverse_lazy, reverse

# Create your views here.
def table_view(request):
    all_shoes = Shoe.objects.all()
    context = {'all_shoes':all_shoes}
    return render(request, 'shoes/table.html', context=context)


class ShoeDetail(DetailView):
    #shoe_detail.html
    model = Shoe
    #template_name = 'shoes/shoe_detail.html'