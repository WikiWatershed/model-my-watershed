# -*- coding: utf-8 -*-
from django.db.models import FileField, JSONField
from django.conf import settings
from django.contrib.gis.db import models
from django.contrib.auth.models import User

from apps.core.models import Job


def project_filename(project, filename):
    return f'project_{project.id}/{filename}'


def scenario_filename(scenario, filename):
    return f'p{scenario.project.id}/s{scenario.id}/{filename}'


class Project(models.Model):
    TR55 = 'tr-55'
    GWLFE = 'gwlfe'
    MODEL_PACKAGES = (
        (TR55, 'Site Storm Model'),
        (GWLFE, 'Watershed Multi-Year Model'),
    )

    user = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(
        max_length=255)
    area_of_interest = models.MultiPolygonField(
        null=True,
        help_text='Base geometry for all scenarios of project')
    area_of_interest_name = models.CharField(
        null=True,
        max_length=255,
        help_text='A human name for the area of interest')
    is_private = models.BooleanField(
        default=True)
    model_package = models.CharField(
        choices=MODEL_PACKAGES,
        max_length=255,
        help_text='Which model pack was chosen for this project')
    created_at = models.DateTimeField(
        auto_now=False,
        auto_now_add=True)
    modified_at = models.DateTimeField(
        auto_now=True)
    is_activity = models.BooleanField(
        default=False,
        help_text='Projects with special properties')
    gis_data = models.TextField(
        null=True,
        help_text='Serialized JSON representation of additional'
                  ' data gathering steps, such as MapShed.')
    mapshed_job_uuid = models.ForeignKey(
        Job,
        to_field='uuid',
        related_name='mapshed_job',
        on_delete=models.SET_NULL,
        null=True,
        help_text='The job used to calculate the MapShed results.'
                  ' Used for getting the results of that job.')
    subbasin_mapshed_job_uuid = models.ForeignKey(
        Job,
        to_field='uuid',
        related_name='subbasin_mapshed_job',
        on_delete=models.SET_NULL,
        null=True,
        help_text='The job used to calculate the MapShed results'
                  ' for each HUC-12 sub-basin of the shape.')
    wkaoi = models.CharField(
        null=True,
        max_length=255,
        help_text='Well-Known Area of Interest ID for faster geoprocessing')
    layer_overrides = JSONField(
        default=dict,
        help_text='JSON object of layers to override defaults with')

    def __unicode__(self):
        return self.name

    @property
    def in_drb(self):
        return self.area_of_interest.within(
            settings.PERIMETERS['DRB_SIMPLE']['geom'])

    @property
    def in_drwi(self):
        return self.area_of_interest.within(
            settings.PERIMETERS['DRWI']['geom'])

    @property
    def in_pa(self):
        return self.area_of_interest.within(
            settings.PERIMETERS['PA_SIMPLE']['geom'])


class WeatherType:

    """Types of weather data available for modeling.

    In sync with modeling/constants.js"""

    # Default, uses data from ms_weather, historical data from ~1960 to ~1990
    DEFAULT = 'DEFAULT'

    # Simulation, uses projections for future weather generated based on
    # historical data. A certain set of pre-calculated simulations will be
    # available to choose from. May only apply to AoIs in a certain area,
    # e.g. within DRB.
    SIMULATION = 'SIMULATION'

    # Valid Simulations currently supported in the app
    simulations = [
        'NASA_NLDAS_2000_2019',
        'RCP45_2080_2099',
        'RCP85_2080_2099',
    ]

    # Custom, user uploaded, may be more accurate, more recent, or more
    # relevant than our default set. Will go through some validation.
    # Must be between 3 and 30 years of data.
    CUSTOM = 'CUSTOM'

    # Django ORM Tuple of Choices
    choices = (
        (DEFAULT, DEFAULT),
        (SIMULATION, SIMULATION),
        (CUSTOM, CUSTOM),
    )


class Scenario(models.Model):

    class Meta:
        unique_together = ('name', 'project')

    name = models.CharField(
        max_length=255)
    project = models.ForeignKey(Project,
                                on_delete=models.CASCADE,
                                related_name='scenarios')
    is_current_conditions = models.BooleanField(
        default=False,
        help_text='A special type of scenario without modification abilities')
    inputs = models.TextField(
        null=True,
        help_text='Serialized JSON representation of scenario inputs')
    inputmod_hash = models.CharField(
        max_length=255,
        null=True,
        help_text='A hash of the values for inputs & modifications to ' +
                  'compare to the existing model results, to determine if ' +
                  'the persisted result apply to the current values')
    modifications = models.TextField(
        null=True,
        help_text='Serialized JSON representation of scenarios modifications ')
    modification_hash = models.CharField(
        max_length=255,
        null=True,
        help_text='A hash of the values for modifications to ' +
                  'compare to the existing model results, to determine if ' +
                  'the persisted result apply to the current values')
    aoi_census = models.TextField(
        null=True,
        help_text='Serialized JSON representation of AoI census ' +
                  'geoprocessing results')
    modification_censuses = models.TextField(
        null=True,
        help_text='Serialized JSON representation of modification censuses ' +
                  'geoprocessing results, with modification_hash')
    results = models.TextField(
        null=True,
        help_text='Serialized JSON representation of the model results')
    created_at = models.DateTimeField(
        auto_now=False,
        auto_now_add=True)
    modified_at = models.DateTimeField(
        auto_now=True)
    weather_type = models.CharField(
        max_length=255,
        default=WeatherType.DEFAULT,
        choices=WeatherType.choices,
        help_text='The source of weather data for this scenario. '
                  'Only applies to GWLF-E scenarios.')
    weather_simulation = models.CharField(
        max_length=255,
        null=True,
        help_text='Identifier of the weather simulation to use.')
    weather_custom = FileField(
        null=True,
        upload_to=scenario_filename,
        help_text='Reference path of the custom weather file.')

    def __unicode__(self):
        return self.name
