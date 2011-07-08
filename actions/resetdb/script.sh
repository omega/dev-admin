#!/bin/sh
# Script to reset a given DB

chdir $drupal_path

drush sql-drop -y

zcat $dump | mysql $db

drush status
drush dbup -y

