$(function() {

  // Use mustache style templates because erb style is conflicting with rails.
  // Now use {{ }} instead of <%= =>
  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };


  //***************************************************************************
  // =Contact Model
  //***************************************************************************


  // Can create a new model with the Backbone.Model.extend function. Takes an
  // object as a parameter that allows us to customize the model
  var Contact = Backbone.Model.extend({

    //define a defaults property (an object as a value) to specify some of the
    //default attributes you want the model to have.
    defaults: {
      photo: "",
      name: "",
      address: "",
      tel: "",
      email: "",
      type: ""
    }
  });

  //***************************************************************************
  // =Directory Collection (Collection of Models)
  //***************************************************************************


  // Use collections to define collections of models. In this case Directory is
  // a collection of Contacts. Again takes an object as a parameter.
  var Directory = Backbone.Collection.extend({

    // Set "model" property to define what the collection is of.
    model: Contact,
    url: '/contacts'
  });


  //***************************************************************************
  // =ContactView
  //***************************************************************************


  // Define a view
  var ContactView = Backbone.View.extend({
    // Specify the container of the view (typically div, li, section, article, etc)
    tagName: "article",

    // Specifies a class name added to container
    className: "contact-container span4",

    // Specify a template for the view
    template: _.template($("#contactTemplate").html()),
    editTemplate: _.template($('#contactEditTemplate').html()),

    initialize: function() {
      this.model.on("sync", this.syncComplete, this);
    },

    // Define a render method that will create the html and then set it to this.el
    // this function does not add it to the DOM, in this case. Once the element (el)
    // has been added to the DOM, then render() will update that element.
    render: function() {

      // uses the _.template method to create a template
      this.$el.html(this.template(this.jsonForTemplate()));
      // return this to allow chaining. (which is the view object that the render
      // method was called on
      return this;
    },

    // returns a modified model json object, that adds a default photo if the model
    // doesn't have one. Use this json object when rendering a template.
    jsonForTemplate: function() {
      var jsonModel = this.model.toJSON();
      if(jsonModel.photo === null || jsonModel.photo === "") {
        jsonModel.photo = placeHolderImagePath;
      }
      return jsonModel;
    },

    events: {
      //add event handler to the delete button on a contact.
      "click button.delete": "deleteContact",

      //add event handlers to edit a contact.
      "click button.edit": "editContact",
      "change select.type": "addType",
      "click button.save": "saveEdits",
      "click button.cancel": "cancelEdits"
    },

    //delete a contact
    deleteContact: function() {
      // delete the model (usually would delete on the server also)
      this.model.destroy();
      // remove the view from the DOM, and remove all bound events to it
      this.remove();
      // removed all bound events to the ContactsView
      this.off();
    },

    //add the edit contact form to the view.
    editContact: function() {
      //replace the current contact view with the edit contact view template
      this.$el.html(this.editTemplate(this.model.toJSON()));

      //crate a new option for the contact type selector
      var newOpt = $("<option/>", {
        html: "<em>Add new...</em>",
        value: "addType"
      });

      //crate a selector element (from the directory.createSelected() function
      this.select = directory.createSelected().addClass("type")
        .val(this.$el.find("#type").val())              // set selector to the contact's current type
        .append(newOpt)                                 // append the new option to the selector
        .insertAfter(this.$el.find('.name'));           // insert the selector after the name inputs

      this.$el.find("input[type='hidden']").remove();     // remove the hidden input field.
    },

    // If add new type is selected then remove the selector and add an input field
    // so that a person can add a new contact type.
    addType: function() {
      if(this.select.val() === 'addType') {
        this.select.remove();
        $('<input />', {
          "class": "type"
        }).insertAfter(this.$el.find('.name')).focus();
      }
    },

    saveEdits: function(e) {
      e.preventDefault();
      var formData = {};

      // the ":input" is a jquery selector that allows you to select all input, textarea,
      // select, and button elements.
      // http://api.jquery.com/input-selector/

      //basically add all of the form data into the formData object as key value pairs.
      $(e.target).closest("form").find(":input").not(':button').each(function() {
        var el = $(this);
        formData[el.attr("class")] = el.val();
      });

      // set the model attributes
      this.model.set(formData).save();
      // render the model view
      this.render();
      // update directory filter
      directory.renderFilter();
    },

    // cancel edits. All edits are disregarded and the old model is rendered again.
    cancelEdits: function() {
      this.render();
    }
  });


  //***************************************************************************
  // =DirectoryView
  //***************************************************************************


  // Define a second view for the Directory collection.
  var DirectoryView = Backbone.View.extend({

    // store the DOM element associated with this View.
    el: $('#contacts'),
    // store the Directory filter element on the page
    $filter: $('#filter'),

    // Initialize function. this is run immediately when a new instance of this object
    // is created.
    initialize: function() {
      var that = this;
      // associate this view with the Directory collection. Also create a new directory
      // collection given the JSON array of contacts. Each object from the contacts array
      // is used to create the Contact models in the Directory collection
      this.collection = new Directory(contacts);

      // array of contact views for models in the Directory collection
      this.contactViews = [];
      this.collection.each(function(contact){
        var cv = new ContactView({
          model: contact
        });
        that.contactViews.push(cv);
      });

      //Render view when a DirectoryView object is created
      this.render();
      this.renderFilter();

      // Bind an event handler on the change:filterType event. When the event is triggered
      // call the filterByType method.
      this.on("change:filterType", this.filterByType, this);

      this.collection.on("sync", this.syncComplete, this);
      //callbacks to sync contactViews array
      this.collection.on('add', this.contactAdded, this);
      this.collection.on('remove', this.contactRemoved, this);

      // callbacks to re-render the filter whenever a contact is added or removed
      this.collection.on('add', this.renderFilter, this);
      this.collection.on('remove', this.renderFilter, this);
    },

    // Render function
    render: function(filter) {
      var that = this;

      //remove all contacts before adding them
      this.$el.find("article").detach();

      // only show contacts that match the filter
      if(filter && filter !== "all") {
        _.each(this.contactViews, function(contact){
          if(contact.model.get("type") === filter) {
            that.$el.append(contact.render().el);
          }
        })
      }
      else {
        // show all contacts
        _.each(this.contactViews, function(contact) {
          that.$el.append(contact.render().el);
        });
      }
    },

    // Get an array of unique types from the list of contacts. Look at documentation
    // to understand underscore uniq function and collection pluck function.
    // pluck is a simple way to create an array of a single attribute from a
    // collection of objects.
    getTypes: function() {
      return _.uniq(this.collection.pluck("type"), false, function(type) {
        return type.toLowerCase();
      });
    },

    //Create the html selector
    createSelected: function() {

      // this uses the jquery selector to create a new html select element
      // docs: http://api.jquery.com/jQuery/#jQuery2
      var select = $('<select/>', {
        html: "<option>all</option>"
      });

      // here we add the unique types from getTypes() to the html select element
      _.each(this.getTypes(), function(item) {
        var option = $("<option/>", {
          value: item.toLowerCase(),
          text: item.toLowerCase()
        }).appendTo(select);
      });
      return select;
    },

    renderFilter: function() {
      this.$filter.empty();
      this.$filter.append(this.createSelected());
    },

    //Set up event handlers
    events: {
      //specify (1) type of event and (2) the select to bind the event handler to
      "change #filter select": "setFilter",
      "click #add": "addContact",
      "click #showForm": "showForm"
    },

    // this setFilter event handler is called when the change event happens on the
    // "#filter select" object.
    setFilter: function(e) {

      //Set the current selected type to the filterType property
      this.filterType = e.currentTarget.value;

      //Trigger the custom event "change:filterType"
      this.trigger("change:filterType");
    },

    //filter the collection by the saved filterType
    filterByType: function() {

      // if the user directly types in the filter URL instead of using the selector
      // make sure the selector is correct
      this.$filter.find('select').val(this.filterType);

      this.render(this.filterType);
      //set the url
      contactsRouter.navigate("filter/" + this.filterType);
    },

    // Event handler when the add Contact form "add" button is clicked
    addContact: function(e) {
      e.preventDefault();
      var newContact = {}; //empty contact

      //get the inputs from the new contact form and create a new object with them.
      $('#addContact').find("input").each(function(i, el) {
        //el is the element. Check to make sure that it is not blank.
        if($(el).val() !== "") {
          //set new key value pairs a new contact.
          newContact[el.id] = $(el).val();
        }
      });

      // create a new filter based off of new contact type
      this.$el.find('#filter').find("select").remove().end().append(this.createSelected());

      // create a new contact and push to server. will trigger a sync method
      this.collection.create(newContact);
    },

    // show / hide the add new contact form.
    showForm: function() {
      this.$el.find('#addContact').slideToggle();
    },

    // callback for collection.add event
    // For the contact added to the collection, add a ContactView to the ContactViews
    // array and render it
    contactAdded: function(contact) {
      var cv = new ContactView({
        model: contact
      });
      //add to the contactsViews array
      this.contactViews.push(cv);
      this.$el.append(cv.render().el);
    },

    // callback for collection.remove event
    // For the removed contact, remove the associated ContactView from the ContactViews
    // array
    contactRemoved: function (model) {
      var toRemove = _.find(this.contactViews, function(view) {
        return view.model === model;
      });
      //remove from the contactsViews array
      this.contactViews.splice(this.contactViews.indexOf(toRemove), 1);
    },

    // if a model is part of a collection then the sync event handler on
    // the collection is triggered even when a model is edited
    syncComplete: function(e) {
      console.log("synced");
    }
  });


  //***************************************************************************
  // =Router
  //***************************************************************************


  // Create a custom route where you can set the filter with the url.
  var ContactsRouter = Backbone.Router.extend({
    routes: {
      "test": "test",
      "filter/:type": "urlFilter"
    },
    urlFilter: function(type) {
      // set the filter to the type specified in the url then trigger the
      // change:filterType custom event.
      directory.filterType = type;
      directory.trigger("change:filterType");
    },
    test: function() {
      alert("hello!");
    }
  });


  //***************************************************************************
  // =Startup code.
  //***************************************************************************


  // instantiate a DirectoryView (and hence have it inserted into the DOM).
  var directory = new DirectoryView();

  //Create routing
  var contactsRouter = new ContactsRouter();

  //NEED THIS LINE FOR ROUTING TO WORK!!
  Backbone.history.start();

});
