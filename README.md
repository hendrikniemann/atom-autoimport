# Atom auto import plugin

## Introduction

I love the new ES2015 module system and so do you. But writing imports at the beginning of your file is tiring. You have to jump around in your code and most of the time the import statement is very trivial. Why is there no editor plugin that writes these imports for me? Look no further, powered by [flow](https://github.com/facebook/flow) this plugin should be able to write 98% of the imports for you!

## Requirements

This plugin uses [flow](https://github.com/facebook/flow) to find unresolved identifiers in your code and add them to the import section of your file. This project is in an early stage and does not offer a lot of configuration. Instead it assumes a standard JavaScript project setup.

### Checklist

* You will need a project structure like this
  ```
  project/
    node_modules/
      .bin/
        flow # Flow executable exists in node_modules
    src/ # This is where you write your JavaScript and run the import plugin on files
    package.json # This file contains your dependencies
    .flowconfig # This
  ```
  Where project is your root directory that flow will be executed in.
* You have `flow-bin@>0.66.0` installed as a devDependency or dependency and you use it to type-check your code

This repository is setup in that manner and can be used as a reference.

## Installation and usage

Install the `autoimport` package using the settings or use the cli:

```
apm install autoimport
```

To execute the `autoimport:import` command use `CMD` `CTRL` `o` on Mac or execute the command manually.
