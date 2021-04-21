# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2021-04-21

### Added

- new `syntax` config key -- supports: `"twig"`

### Fixed

- file system pathing issues

### Removed

- CSV file generation
- JSON file generation
- `project` config key -- replaced with `syntax`

## [0.1.0] - 2020-01-18

### Added

-   new CLI based translator
-   support for `craft` projects
-   outputs `translations.csv` file
-   accepts `.csv` file and converts to `.json` and `.php` per local using `--input` flag

## [0.0.1] - 2020-01-16

### Added

-   registered package name
-   renamed to `dragomanjs`

[unreleased]: https://github.com/codewithkyle/dragomanjs/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/codewithkyle/dragomanjs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/codewithkyle/dragomanjs/releases/tag/v0.1.0
