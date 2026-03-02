# User Profile Migration Script

This script updates user profile data in the `projects`, `surveySubmissions`, and `observationSubmissions` collections in MongoDB, based on user IDs provided in an input file. It is designed for batch migration and profile enrichment workflows.

## How It Works

1. **Input Preparation**
   - The script reads user IDs from `input.js` (must export an array of user IDs).
   - Example:
     ```js
     module.exports = [
       "userId1",
       "userId2"
     ];
     ```

2. **Profile Fetching**
   - For each user ID, the script fetches the user profile using a private API endpoint.
   - For testing, you can use hardcoded profile data instead of the API call.

3. **Eligibility Check**
   - Only users whose profile contains a `userLocations` entry with `type: "school"` are eligible for update.

4. **Batch Processing**
   - User IDs are processed in chunks (default batch size: 2, configurable via `batchSize`).
   - For each eligible user, the script updates their profile in:
     - `projects` (by `userId`)
     - `surveySubmissions` (by `createdBy`)
     - `observationSubmissions` (by `createdBy`)
   - Only records created after a specific date (`creationBoundary`) are updated.

5. **Logging and Output**
   - After processing all chunks, a summary is written to an output file in the `output` folder, named with the execution timestamp (e.g., `output_1709395200000.json`).
   - The summary includes:
     - Execution date
     - Eligible user IDs and count
     - Successfully updated user IDs and count
     - Updated project IDs and count
     - Detailed log of each user's update status

6. **Input File Update**
   - After all processing, successfully updated user IDs are removed from `input.js`.

## How to Run

**Read mode (default, no DB updates):**

```bash
node updateUserProfiles.js
```

**Write mode (DB updates enabled):**

```bash
node updateUserProfiles.js write
```

- The script uses a 1-second delay between API calls to avoid rate limiting.
- For testing, you can use hardcoded profile data instead of the API call.
- The script expects MongoDB collections to have a `createdAt` field for date filtering.
- Only use the private user profile API endpoint for migration workflows.

## Troubleshooting
- Ensure MongoDB and the user service are accessible from your environment.
- Check `.env` configuration and input file format.
- Review console logs for progress and errors.

---

For questions or issues, contact the project maintainer.
