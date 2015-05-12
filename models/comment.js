let mongoose = require('mongoose')
let nodeify = require('nodeify')
require('songbird')

let commentSchema = mongoose.Schema({
	username: {
	type: String,
	required: true
	},
	content: {
	type: String,
	required: true
	},
	postId: {
	type: String,
	required: true
	},
	postAuthor: {
	type: String,
	required: true
	},
	createdAt: Date,
	updatedAt: Date
})


commentSchema.pre('save', function(callback) {
	nodeify(async() => {
		// get the current date
		let currentDate = new Date()

		// change the updated_at field to current date
		this.updatedAt = currentDate

		// if created_at doesn't exist, add to that field
		if (!this.createdAt) this.createdAt = currentDate
	}(), callback)
})

module.exports = mongoose.model('Comment', commentSchema)
