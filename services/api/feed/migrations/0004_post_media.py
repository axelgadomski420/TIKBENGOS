from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("feed", "0003_merge_feed_leaves")]

    operations = [
        migrations.AlterField(
            model_name="post",
            name="body",
            field=models.CharField(blank=True, default="", max_length=2000),
        ),
        migrations.AddField(
            model_name="post",
            name="media_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="post",
            name="audio_description",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
