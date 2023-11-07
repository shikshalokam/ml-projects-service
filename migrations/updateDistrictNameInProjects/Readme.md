## Migrations

#### Steps to run the script files

In order to execute this migration script, we need to first log in to the pod where the service is running and then proceed with the provided instructions.

This script is designed to update project documents specifically for cases where there is a mismatch in district names. It will only affect the IDs specified in the script.

### Step 1:

    Navigate to /opt/projects/updateDistrictNameInProjects/

### Step 2:

Run the script to update projects.

    node updateDistrictName.js
