class Contact < ActiveRecord::Base
  attr_accessible :address, :email, :name, :photo, :tel, :type
  self.inheritance_column = 'inheritance_type'
end
