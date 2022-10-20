# Purge Assistant
Purge Assistant is an extension that is able to delete entire sections, along with their content, in a single click. This enables developers to delete sections without having to individually click delete, only for them to be marked as inactive.
## How it works
By utilizing T4's background web API, this extension emulates collecting each content & section ID, then sends a POST request to the purge endpoint(s) to delete all the content and sections, so none hang in limbo.
## Installing
1. Download the zip file then extract the folder to your desktop.
2. Open chrome, open extensions, then enable developer mode.
3. Click on `load unpacked extension`, then select the extracted folder.
## Usage
![gif of full usage](https://i.imgur.com/5CvtZvN.gif)