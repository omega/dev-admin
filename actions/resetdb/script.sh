#!/bin/sh
# Script to reset a given DB

# XXX: Need a way to specify what data is needed
echo mysql drop database $db
sleep 10
echo mysql create database $db
sleep 10
echo "zcat $dump | mysql $db"
exit 1
