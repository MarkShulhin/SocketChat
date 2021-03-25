const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000).sockets;
require('dotenv').config();

// Connect to mongo
mongo.connect(process.env.DB_URL, { useUnifiedTopology: true } ,function(err, cl) {
    if(err) {
        throw err;
    }

    console.log('MongoDB connected...');

    // Connect to Socket.io
    client.on('connection', socket => {
        const db = cl.db('socketchat');
        let chat = db.collection('chats');

        // Create function to send status
        const sendStatus = s => socket.emit('status', s);

        // Get chats from mongo collection
        chat.find().limit(100).sort({ _id:1 }).toArray((err, res) => {
            if(err) {
                throw err;
            }

            // Emit the messages
            socket.emit('output', res);
        });

        // // Emit the online
        // socket.on('connection', () => {
        //     sendStatus({
        //         message: 'User joined',
        //         clear: true,
        //         online: Object.keys(client.connected).length
        //     });
        // });
        //
        // socket.on('disconnection', () => {
        //     sendStatus({
        //         message: 'User left',
        //         clear: true,
        //         online: Object.keys(client.connected).length
        //     });
        // });

        // Handle input events
        socket.on('input', data => {
            let name = data.name;
            let message = data.message;

            // Check for name and message
            if(name === '' || message === '') {
                // Send error status
                sendStatus('Please enter a name and message');
            } else {
                // Insert message
                chat.insertOne({name: name, message: message}, () => {
                    client.emit('output', [data]);

                    // Send status object
                    sendStatus({
                        message: 'Message sent',
                        clear: true
                    });
                })
            }
        });

        // Handle clear
        socket.on('clear', (data) => {
            // Remove all chats from the collection
            chat.removeMany({}, () => {
                // Emit
                socket.emit('cleared');
            });
        });
    });
});
