from torch.utils.tensorboard import SummaryWriter
import numpy as np

# Create a SummaryWriter to log information for TensorBoard in the specified directory
writer = SummaryWriter('main_plugin/logs/fake_bert')

# Number of epochs to simulate
num_epochs = 100

for epoch in range(num_epochs):
    # Generate random loss and accuracy for both training and testing
    train_loss = np.random.uniform(0.5, 1.0)  # Simulate decreasing loss over epochs
    train_accuracy = np.random.uniform(0.5, 0.8)  # Simulate increasing accuracy over epochs
    test_loss = np.random.uniform(0.3, 0.7)  # Simulate decreasing loss over epochs
    test_accuracy = np.random.uniform(0.7, 0.9)  # Simulate increasing accuracy over epochs

    # Log loss and accuracy to TensorBoard
    writer.add_scalar('Loss/train', train_loss, epoch)
    writer.add_scalar('Accuracy/train', train_accuracy, epoch)
    writer.add_scalar('Loss/test', test_loss, epoch)
    writer.add_scalar('Accuracy/test', test_accuracy, epoch)

    # Generate and log random FLOP counts for different types of layers
    flops_conv2d = np.random.randint(100000, 200000)  # Random FLOP count for Conv2D
    flops_flatten = np.random.randint(310000, 302000)  # Random FLOP count for Flatten
    flops_dense = np.random.randint(200000, 300000)  # Random FLOP count for Dense

    writer.add_scalar('FLOPs/Conv2D', flops_conv2d, epoch)
    writer.add_scalar('FLOPs/Flatten', flops_flatten, epoch)
    writer.add_scalar('FLOPs/Dense', flops_dense, epoch)

# Close the writer when we're done
writer.close()
