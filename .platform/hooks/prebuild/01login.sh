#!/bin/bash
USER=$(/opt/elasticbeanstalk/bin/get-config environment -k DOCKER_USER)
PASSWD=$(/opt/elasticbeanstalk/bin/get-config environment -k DOCKER_PASSWD)
echo "$PASSWD" | docker login -u $USER --password-stdin
