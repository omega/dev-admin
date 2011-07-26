#!/bin/sh
# Script to reset a given DB

cd $drupal_path

drush sql-drop -y

zcat $dump | mysql -u root $db

drush updatedb -y
drush cc all
drush pm-enable update -y
drush pm-refresh

# If you get errors below here, you most likely miss a module:
# http://drupalcode.org/project/drush_role.git/blob/d727a54:/role.drush.inc
#
drush pm-enable devel -yes
drush vset devel_query_display 1 -yes
drush role-add-perm --module=devel 1 'access devel information'
drush role-add-perm --module=devel 2 'access devel information'
drush vset error_level "1" -yes

