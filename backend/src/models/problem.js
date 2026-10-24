const mongoose = require('mongoose');
const {Schema} = mongoose;

// Keep in sync with frontend/src/lib/constants.js
const PROBLEM_TAGS = [
    'array', 'string', 'linkedList', 'stack', 'tree', 'graph', 'dp', 'greedy',
    'heap', 'math', 'sorting', 'binarySearch', 'twoPointers', 'slidingWindow',
    'backtracking', 'bitManipulation'
];

const problemSchema = new Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    difficulty:{
        type:String,
        enum:['easy','medium','hard'],
        required:true,
    },
    tags:{
        type:String,
        enum:PROBLEM_TAGS,
        required:true
    },
    visibleTestCases:[
        {
            input:{
                type:String,
                required:true,
            },
            output:{
                type:String,
                required:true,
            },
            explanation:{
                type:String,
                required:true
            }
        }
    ],

    hiddenTestCases:[
        {
            input:{
                type:String,
                required:true,
            },
            output:{
                type:String,
                required:true,
            }
        }
    ],

    startCode: [
        {
            language:{
                type:String,
                required:true,
            },
            initialCode:{
                type:String,
                required:true
            }
        }
    ],

    referenceSolution:[
        {
            language:{
                type:String,
                required:true,
            },
            completeCode:{
                type:String,
                required:true
            }
        }
    ],

    problemCreator:{
        type: Schema.Types.ObjectId,
        ref:'user',
        required:true
    }
})


const Problem = mongoose.model('problem',problemSchema);

module.exports = Problem;
module.exports.PROBLEM_TAGS = PROBLEM_TAGS;


