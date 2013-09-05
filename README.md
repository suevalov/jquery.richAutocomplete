jquery.richAutocomplete 0.1
=======================

Autocomplete plugin with some advanced features:

	* Different data providers: asychronous data provider, local data provider. Possibility to create your own data providers, for example, local storage data provider.
	* Placeholder for input, which works in all browsers.
	* Possibily to setup template for result item.
	* Possibility to group results to differents chunks.
	* Possibility to setup different templates for different chunks.

### Basic initialization

```js

$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteAjaxProvider("some/sample/url")
});

```
