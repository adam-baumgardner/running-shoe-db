from django.db import models
from django.urls import reverse
import uuid

# Create your models here.
class Shoe(models.Model):
    brand = models.ForeignKey('Brand', on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=200)
    foam = models.CharField(max_length=200)
    model_number = models.IntegerField(null=True)
    release_year = models.IntegerField(null=True)
    weight_ounces = models.FloatField(null=True)
    heel_stack_mm = models.IntegerField(null=True)
    forefoot_stack_mm = models.IntegerField(null=True)
    drop_mm = models.IntegerField(null=True)
    is_plated = models.BooleanField(default=False)
    is_current = models.BooleanField()

    SPORT_LIST = [
        ('rr', 'Road Running'),
        ('tr', 'Trail Running'),
        ('cc', 'Cross Country'),
        ('tf', 'Track & Field')
    ]

    USAGE_LIST = [
        ('d', 'Daily'),
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
        return f"{self.name}"


class Brand(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name

class Colorway(models.Model):
    shoe = models.ForeignKey('Shoe', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name
    
class Review(models.Model):
    reviewer = models.ForeignKey('Reviewer', on_delete=models.CASCADE)
    shoe = models.ForeignKey('Shoe', on_delete=models.CASCADE)
    rating_numerator = models.IntegerField(null=True)
    rating_denominator = models.IntegerField(null=True)
    review_text = models.TextField(null=True)
    url = models.URLField(max_length=500, null=True)

    def __str__(self):
        short_text = self.review_text[:10]
        return f'{self.rating_denominator} out of {self.rating_denominator} - "{short_text}..."'

class Reviewer(models.Model):
    name = models.CharField(max_length=200)
    website = models.URLField(max_length=500, null=True)

    def __str__(self):
        return self.name