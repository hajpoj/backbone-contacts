class Contact < ActiveRecord::Base
  attr_accessible :address, :email, :name, :photo, :tel, :type
end
