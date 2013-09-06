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

### Settings

There are some properties that you can setup:

| Property    | Description   |
| ------------- |-------------|
| provider    | data provider *[required]* |
| minLength   |  minimal characters count to start searching *[default_value = 1]* |
| placeholder | placeholder for input, you should pay attention, that 'placeholder' attribute in input overriders 'placeholder' setting  |
| maxViewedCount | maximum items count, which will be visible in popup container *[default_value = false]* |
| containerWidth | by default popup container width equals input width, but you can override it by setting up this parameter with concrete pixels *[default_value = false]* |  

### Data providers

There are 3 implemented data providers for plugin:
* static data provider;
* asychronous data provider;
* asychronous data provider with caching.

You can implement your own data provider. Creating new data provider described below.
#### Static data provider
```js
var cities = [
	{
		id: 1,
		label: "New York"
	},
	...
	{
		id: 10,
		label: "Moscow"
	}
];

$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteDataProvider(cities)
});
```
