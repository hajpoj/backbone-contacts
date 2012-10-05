class Contact < ActiveRecord::Base
  attr_accessible :address, :email, :name, :photo, :tel, :type
  self.inheritance_column = 'inheritance_type'

  #Override as_json to format json response in a particular way.
  #http://stackoverflow.com/questions/2572284/how-to-override-to-json-in-rails
  def as_json(options ={})
    super(options.merge(only: [:id, :address, :email, :name, :photo, :tel, :type]))
  end
end
