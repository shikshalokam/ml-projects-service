## Migrations

#### Steps to run the script files

In order to execute this migration script, we need to first log in to the pod where the service is running and then proceed with the provided instructions.

This script will update projects in cases where the user profile is missing and there is a mismatch between userProfile and userRoleInformations.

### Step 1:

    Navigate to /opt/projects/updateUserProfileAndMissMatchOfRoleInformation/

### Step 2:

Run the script to update projects.

    node updateProjectWithProfileData.js
