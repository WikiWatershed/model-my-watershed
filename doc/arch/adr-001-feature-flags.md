# 001 - Feature Flags

## Context

We need to add a mechanism to toggle features in MMW so that we can deploy
multiple implementations from the same codebase. For example, in BiG CZ,
we'll need to disable Analyze mode and other MMW-specific features such as
ITSI integration.

Primary deciding factors:

* How will this impact development?
* How easy will it be to switch from MMW to BiGCZ?
* How will this impact deployments?

Here are the options that I considered:

### [gutter-django](https://github.com/disqus/gutter-django)
* Too complicated
* Not actively maintained

### [gargoyle-yplan](https://gargoyle-yplan.readthedocs.io/en/latest/)
* Actively maintained fork
* Documentation not great
* Can add default values in `settings.py`
* Flags are stored in database

### [django-waffle](https://waffle.readthedocs.io/en/v0.11.1/)
* Popular
* Good documentation
* Not very active
* Has JavaScript interface
* Flags are stored in database

### None of the above (custom code)
* No database required
* We already have some conventions in place for custom settings

## Decision

We have decided to follow existing conventions to add custom settings
to MMW to support BiG CZ instead of adding a feature flipper library.

Because flags will rarely change, and we don't need any advanced features
beyond swiching boolean flags, the overhead of adding and maintaining another
dependency may not be worthwhile.
By storing custom settings in Python instead of the database, we'll avoid
the need to enhance our deployment process to support loading data
fixtures. Switching between MMW and BiG CZ will be done by using
an environment variable.

## Consequences

There may be long-running consequences to disabling entire features using
flags, no matter which implementation we choose. We'll need to be
careful to make sure that the work we do on BiG CZ doesn't negatively
impact the functionality of MMW and vice versa.
