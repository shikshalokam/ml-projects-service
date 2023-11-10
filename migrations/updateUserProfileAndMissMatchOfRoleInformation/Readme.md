## Migrations

#### Steps to run the script files

This script is intended to address a particular bug in Diksha Prod, and it is unrelated to the 6.0.0 release.

Here is the ticket for this issue:- (Click Here)[https://project-sunbird.atlassian.net/browse/ED-3101].

In order to execute this migration script, we need to first log in to the pod where the service is running and then proceed with the provided instructions.

This script will update projects in cases where the user profile is missing and there is a mismatch between userProfile and userRoleInformations.

### Step 1:

    Navigate to /opt/projects/migrations/updateUserProfileAndMissMatchOfRoleInformation/

### Step 2:

Run the script to update projects.

    node updateProjectWithProfileData.js
