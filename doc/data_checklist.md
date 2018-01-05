## Working With Large SQL Data Dumps

Working with large SQL dump files can be a high risk endeavor;
the size of some files can cause a small mistake early on to 
trash hours of work dumping, zipping, uploading and importing
the file. To ensure we are measuring twice and cutting once,
copy and paste the checklist at the bottom of this list
into issues that involve loading new SQL data.
For example, issues like [#1531](https://github.com/WikiWatershed/model-my-watershed/issues/1531), [#2532](https://github.com/WikiWatershed/model-my-watershed/issues/2532), [#1408](https://github.com/WikiWatershed/model-my-watershed/issues/1408).

## Process

1. Load or create the data/updates on your local Postgres instance
1. Verify the table you are about to dump
     - Inspect the table and ensure all desired columns and indices are present.

    ```bash
    ./scripts/manage.sh dbshell
    mmw>  \d the_table_name
    ```
     **Things to consider:**
     - How many rows are present?
     - Are there columns that should have unique values, but don't?
     - What columns will we primarily operate on? Does every row contain a value for these columns? Should they?
     - Will we be performing joins, spatial or otherwise, with other tables? How performant are these joins? Would they benefit from a new index?
1. `pg_dump` it!
     - If you're exporting a table, the command may look like this:
    ```bash
    $ vagrant ssh services
    $ pg_dump -c --if-exists -O
            -t the_table_name \
            -h localhost -U mmw mmw \
        > /vagrant/thedump.sql
    ```
1. Sanity check the `pg_dump` output
    ```bash
    # The first 40-60 lines will likely contain 
    # DROP and CREATE_TABLE statements you should verify.
    head -n 45 thedump.sql
    
    # The end of the file will likely create
    # any required indices.
    # It should also contain a comment stating the pg_dump
    # is complete.
    tail thedump.sql
    ```
1. Gzip and upload to data bucket
    ```bash
    ./scripts/data/upload_sql_data.sh [-p MMW_STG_AWS_PROFILE] PATH_TO_FILE [DST_FILE_NAME]
    # eg
    ./scripts/data/upload_sql_data.sh -p mmw-stg ./data/new_nhdflowlines_with_slope.sql nhdflowline
    # Will create s3://data.mmw.azavea.com/nhdflowline_1513899196.sql.gz
    ```
1. Update `./scripts/aws/setupdb.sh`
     - Add or edit the new file name to the relevent load command.
1. Document the data processing
     - If the changes are small, include in the `setup.sh` script commit
        what actions were performed to go from source data to final dump.
     - If the steps were significant, include a script in `./scripts/data/???.sql` by which the processing can be reproduced
1. Open a PR
1. When your PR is merged, and the time is right apply changes to staging
    - Run `./scripts/aws/setupdb.sh ...` on staging
1. Create (or add to) an issue on what we need to apply to production
    - When we release to production, we'll need remember to run `./scripts/aws/setup.sh ...` with the relevent data
1. At the release after next, delete older versions if they exist
    - Keep the data bucket slim

## Checklist

- [ ] Read over [data_checklist.md](https://github.com/WikiWatershed/model-my-watershed/tree/develop/doc/data_checklist.md)
- [ ] Load or create the data/updates on your local Postgres instance
- [ ] Verify the table you are about to dump
- [ ] `pg_dump` it!
- [ ] Sanity check the `pg_dump` output with `head` and `tail`
- [ ] Gzip and upload to data bucket with `./scripts/data/upload_sql_data.sh`
- [ ] Update `./scripts/aws/setupdb.sh`, document data processing steps, and commit
- [ ] Open a PR
- [ ] Run `./scripts/aws/setupdb.sh ...` on staging
- [ ] Create (or add to) an issue on what we need to apply to production
- [ ] At the release after next, delete older versions if they exist
