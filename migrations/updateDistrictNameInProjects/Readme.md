## Migrations

#### Steps to run the script files

This script is intended to address a particular bug in Diksha Prod, and it is unrelated to the 6.0.0 release.

Here is the ticket for this issue:- (Click Here)[https://project-sunbird.atlassian.net/browse/ED-3101].

In order to execute this migration script, we need to first log in to the pod where the service is running and then proceed with the provided instructions.

This script is designed to update project documents specifically for cases where there is a mismatch in district names. It will only affect the IDs specified in the script.

This script is intended to correct inconsistencies in district names within project documents.

### Step 1:

    Navigate to /opt/projects/migrations/updateDistrictNameInProjects/

### Step 2:

Run the script to update projects.

    node updateDistrictName.js

### Step 3:

This script is designed to refresh project documents by incorporating the most recent profile information along with the individual's previous role in the project.

Run the script to update projects.

    node updateUserProfileDistrictNameMissing.js
