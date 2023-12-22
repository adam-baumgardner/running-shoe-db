from django.db import models
from django.urls import reverse
import uuid

# Create your models here.
class Shoe(models.Model):
    brand = models.ForeignKey('Brand', on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=200)
    foam = models.CharField(max_length=200)
    model_number = models.IntegerField()
    release_year = models.CharField(max_length=4, null=True)
    weight_ounces = models.FloatField(null=True)
    heel_stack_mm = models.IntegerField(null=True)
    forefoot_stack_mm = models.IntegerField(null=True)
    drop_mm = heel_stack_mm - forefoot_stack_mm
    shoe_type = models.ForeignKey('ShoeType', on_delete=models.SET_NULL, null=True)
    #, plate, heel width, midfoot fit, toebox fit
    is_current = models.BooleanField()

class Brand(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name

class Colorway(models.Model):
    pass

class ShoeType(models.Model):
    # trail vs road vs track & field vs cross country
    # daily vs trainer vs racer
    # neutral vs stability
    SPORT_LIST = [
        ('rr', 'Road Running'),
        ('tr', 'Trail Running'),
        ('cc', 'Cross Country'),
        ('tf', 'Track & Field')
    ]

    USAGE_LIST = [
        ('d', 'Daily'),
        ('t', 'Trainer'),
        ('r', 'Racing')
    ]

    STABILITY_LIST = [
        ('s', 'Stable'),
        ('n', 'Neutral')
    ]
    
    sport = models.CharField(max_length=2, choices=SPORT_LIST, default='rr')
    usage = models.CharField(max_length=1, choices=USAGE_LIST, default='d')
    stability = models.CharField(max_length=1, choices=STABILITY_LIST, default='n')


    def __str__(self):
        return f"{self.stability}, {self.usage}, {self.sport}"