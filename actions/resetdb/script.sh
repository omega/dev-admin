#!/bin/sh
# Script to reset a given DB

cd $drupal_path

drush sql-drop -y

zcat $dump | mysql -u root $db

drush dbup -y
drush cc all
drush pm-enable update -y
drush pm-refresh
exit 0
