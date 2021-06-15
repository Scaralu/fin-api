const { request } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const customers = [];

function verifyIfCpfExists(request, response, next) {
  const { cpf } = request.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json('Customer not found');
  }

  request.customer = customer;
  return next();
}

function getBalance(customer_statement) {
  const balance = customer_statement.reduce((accumulator, operation) => {
    if (operation.type === 'credit') {
      return accumulator + operation.amount;
    } else {
      return accumulator - operation.amount;
    }
  }, 0);

  return balance;
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customersAlreadyExists = customers.some(
    (customers) => customers.cpf === cpf
  );

  if (customersAlreadyExists) {
    return response.status(400).json({
      error: "Customer already exists"
    });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  })

  return response.status(201).send();
});

app.get('/statement', verifyIfCpfExists, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

app.get('/statement/date', verifyIfCpfExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;
  
  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statements) => 
      statements.createdAt.toDateString() === new Date(dateFormat).toDateString()
  )

  return response.json(statement);
})

app.post('/deposit', verifyIfCpfExists, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    createdAt: new Date(),
    type: 'credit',
  }

  customer.statement.push(statementOperation);
  response.status(201).send();
});

app.post('/withdraw', verifyIfCpfExists, (request, response) => {
  const { amount: withdraw_amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < withdraw_amount) {
    return response.status(400).json({
      message: 'Quantity exceeds your balance'
    })
  }

  const statementOperation = {
    amount: withdraw_amount,
    createdAt: new Date(),
    type: 'debit',
  }

  customer.statement.push(statementOperation);
  return response.status(201).send();
})

app.listen(3333);