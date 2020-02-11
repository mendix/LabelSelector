# Label-selector [![Support](https://img.shields.io/badge/Mendix%20Support%3A-Platform-green.svg)](https://docs.mendix.com/community/app-store/app-store-content-support)

With this widget you can easily create/assign/remove objects (for example labels) to/from an object.

It features both an inputbox for searching (and optionally creating if not found) and a dropdown to select already existing objects.
The implementation is based on the Tag-it library
Background colors to labels can be set, and the text will in contrast of it background by use of the class 'text-normal' or 'text-contrast'

## Contributing
For more information on contributing to this repository visit [Contributing to a GitHub repository] (https://docs.mendix.com/howto/collaboration-requirements-management/contribute-to-a-github-repository)

##Typical Usage Scenario
* Quickly adjust reference sets.
* Easily creates new objects to add.

##Properties
* *Label Object* - The entity used for the labels, combined with the reference set from the context object.
* *Caption Attribute* - The attribute of the label entity to be used as the caption.
* *Color Attribute* - Optional, The attribute of the label color.
* *Label constraint* - The constraint for the labels.
* *After create label* - A microflow that is triggered after a new label is created and **committed**. This microflow receives the Dataview object.
* *On change microflow* - A microflow that is triggered for every add/remove.
