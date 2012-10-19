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
    className: "contact-container",

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
      var removedType = this.model.get("type").toLowerCase();
      // delete the model (usually would delete on the server also)
      this.model.destroy();
      // remove the view from the DOM
      this.remove();
      // if the list of contacts types is reduced, then update the type's filter.
      if(_.indexOf(directory.getTypes(), removedType) === -1) {
        directory.$el.find("#filter select").children("[value='" + removedType +"']").remove();
      }

      //after this the contacts object array is also has the contact removed.
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
      var formData = {},
        prev = this.model.previousAttributes();

      // the ":input" is a jquery selector that allows you to select all input, textarea,
      // select, and button elements.
      // http://api.jquery.com/input-selector/

      //basically add all of the form data into the formData object as key value pairs.
      $(e.target).closest("form").find(":input").not(':button').each(function() {
        var el = $(this);
        formData[el.attr("class")] = el.val();
      });

      //delete photo attribute if it is null so that the default photo is used.
      if(formData.photo === "") {
        //delete is for deleting properties of a object.
        delete formData.photo;
      }

      // set the model attributes
      this.model.set(formData).save();
      // render the model view
      this.render();

      // this just again just removed so because "images/placeholder.png" is the default value
      // for photos and the following comparisons would fail otherwise
      if(prev.photo === placeHolderImagePath) {
        prev.photo = null;
      }

      // go through the contacts array and replace the contact with the new data.
      _.each(contacts, function(contact) {
        if(_.isEqual(contact, prev)) {
          // this splice removes 1 element and adds the formData object
          contacts.splice(_.indexOf(contacts, contact), 1, formData)
        }
      });
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

    //store the DOM element associated with this View.
    el: $('#contacts'),

    // Initialize function. this is run immediately when a new instance of this object
    // is created.
    initialize: function() {
      // associate this view with the Directory collection. Also create a new directory
      // collection given the JSON array of contacts. Each object from the contacts array
      // is used to create the Contact models in the Directory collection
      this.collection = new Directory(contacts);

      //Render view when a DirectoryView object is created
      this.render();

      //Add type selector to the page
      this.$el.find('#filter').append(this.createSelected());

      // Bind an event handler on the change:filterType event. When the event is triggered
      // call the filterByType method.
      this.on("change:filterType", this.filterByType, this);

      //on the reset event, run the render function
      this.collection.on("reset", this.render, this);

      // when something is added to the collection, set renderContact as the event handler,
      // which will render the item added to the collection
      this.collection.on("add", this.renderContact, this);

      // When something is removed from the collection, remove it from the original array.
      // usually we would remove it from the server.
      this.collection.on("remove", this.removeContact, this);

      this.collection.on("sync", this.syncComplete, this);
    },

    // Render function
    render: function() {
      var that = this;

      //remove all contacts before adding them
      this.$el.find("article").remove();

      // loop through the models in the Directory collection and run the renderContact
      // function
      _.each(this.collection.models, function(item) {
        that.renderContact(item);
      }, this);

      //could do this.collection.each instead of _.each.
    },

    // Function to render each individual contact
    renderContact: function(item) {

      // Create contact views, and set the model to be the Contact Model from the
      // Directory collection.
      var contactView = new ContactView({
        model: item
      });

      // Render the contactView and insert it into the DOM.
      this.$el.append(contactView.render().el);
    },

    // Get an array of unique types from the list of contacts. Look at documentation
    // to understand underscore uniq function and collection pluck function.
    // pluck is a simple way to create an array of a single attribute from a
    // collection of objects.
    getTypes: function() {
      var collection = new Directory(contacts);
      return _.uniq(collection.pluck("type"), false, function(type) {
        return type.toLowerCase();
      });
    },

    //Create the html selector
    createSelected: function() {
      //var filter = this.$el.find('#filter'), // not used anywhere.

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

    //Set up event handlers
    events: {
      //specify (1) type of event and (2) the select to bind the event handler to
      "change #filter select": "setFilter",
      "click #add": "addContact",
      "click #showForm": "showForm"
    },

    // this setFilter event handler is called when the change event happes on the
    // "#filter select" object.
    setFilter: function(e) {

      //Set the current selected type to the filterType property
      this.filterType = e.currentTarget.value;

      //Trigger the custom event "change:filterType"
      this.trigger("change:filterType");
    },

    //filter the collection by the saved filterType
    filterByType: function() {
      if(this.filterType === "all") {
        this.collection.reset(contacts);
        //set the url
        contactsRouter.navigate("filter/all");
      } else {
        this.collection.reset(contacts, {silent: true});
        //create a filtered collection of models
        var filterType = this.filterType,
          filtered = _.filter(this.collection.models, function(item) {
            return item.get("type").toLowerCase() === filterType;
          });
        //reset the collection to only contain the filtered elements.
        this.collection.reset(filtered);
        //set the url
        contactsRouter.navigate("filter/" + filterType);
      }
    },

    // Event handler when the add Contact form "add" button is clicked
    addContact: function(e) {
      e.preventDefault();
      var newContact = {}; //empty contact

      //get the inputs from the new contact form and create a new object with them.
      $('#addContact').children("input").each(function(i, el) {
        //el is the element. Check to make sure that it is not blank.
        if($(el).val() !== "") {
          //set new key value pairs a new contact.
          newContact[el.id] = $(el).val();
        }
      });

      // add the new contact object to the contacts array. Typically we would save
      // this data to the server. Basically contacts maintains a synced version of
      // of all the contacts available.
      contacts.push(newContact);

      // create a new filter based off of new contact type
      this.$el.find('#filter').find("select").remove().end().append(this.createSelected());

      // create a new contact and push to server. will trigger a sync method
      this.collection.create(newContact);
    },

    // show / hide the add new contact form.
    showForm: function() {
      this.$el.find('#addContact').slideToggle();
    },

    // remove contact from the contacts array after it was delete from the Directory
    // collection.
    removeContact: function(removedModel) {
      var removed = removedModel.attributes;

      // remove the photo attribute because all the items in the contacts array
      // do not have a photo attribute (they all inherit it as a default). If we
      // don't remove the photo attribute, all our comparisons will fail.
      if (removed.photo === placeHolderImagePath) {
        delete removed.photo;
      }

      // remove removed contact from contacts array
      _.each(contacts, function(contact) {
        if(_.isEqual(contact, removed)) {
          // Use splice to remove items from a javascript array
          // http://stackoverflow.com/questions/500606/javascript-array-delete-elements
          contacts.splice(_.indexOf(contacts, contact), 1);
        }
      });
    },

    // if a model is part of a collection then the sync event handler on
    // the collection is triggered even when a model is edited
    syncComplete: function(e) {
      alert("synced");
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
