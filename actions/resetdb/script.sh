#!/bin/sh
# Script to reset a given DB

chdir $drupal_path

drush sql-drop -y

zcat $dump | mysql $db

drush dbup -y
drush cc all
drush pm-enable update
drush pm-refresh
