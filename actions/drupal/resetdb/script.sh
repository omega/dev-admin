#!/bin/sh
# Script to reset a given DB

cd $drupal_path

drush sql-drop -y

zcat $dump | mysql -u root $db

drush updatedb -y
drush cc all
drush pm-enable update -y
drush pm-refresh
