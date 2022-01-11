# Generated by Django 3.2.10 on 2021-12-27 19:26
import json
from django.db import migrations


def override_sedaadjust_for_old_projects(apps, schema_editor):
    """
    The default value of SedAAdjust is being changed from 1.5 to 1.25 for all
    new projects, which will use the high resolution "nhdhr" stream data. For
    older projects using the medium resolution "nhd" data, we override the
    value to be 1.5, so they remain consistent with old data, unless they were
    overridden by a user.
    """
    db_alias = schema_editor.connection.alias
    Project = apps.get_model('modeling', 'Project')

    ps = Project.objects.filter(layer_overrides__contains={'__STREAMS__':'nhd'})
    
    for p in ps:
        for s in p.scenarios.all():
            mods = json.loads(s.modifications)
            m_other = next((m for m in mods if m.get('modKey') == 'entry_other'), None)

            if m_other:
                if 'SedAAdjust' not in m_other['output']:
                    m_other['output']['SedAAdjust'] = 1.5
                    m_other['userInput']['SedAAdjust'] = 1.5

                    s.modifications = json.dumps(mods)
                    s.save()
            else:
                mods.append({
                    'modKey': 'entry_other',
                    'output': {'SedAAdjust': 1.5},
                    'userInput': {'SedAAdjust': 1.5}})
                
                s.modifications = json.dumps(mods)
                s.save()


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0038_alter_project_layer_overrides'),
    ]

    operations = [
        migrations.RunPython(override_sedaadjust_for_old_projects),
    ]
