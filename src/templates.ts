// Prompt 3
export const extractActionTemplate = `You are an assistant that is responsible for helping an AI agent called {{agentName}} to determine the best action to take to fulfill a promise.

The AI agent has already made a promise to a counterparty. The promise is described by two components: a Promise Statement and Promise Details. The Promise Details are the information that extends the Promise Statement such that as a whole, these two components describe in exact detail the future action that should be taken by the AI agent to fulfill the promise to the counterparty.

The typical promise has a maturity date which describes the maturity timestamp at which the promise is due. If the maturity timestamp is after the current time, then instruct the agent to do nothing. Else, if the maturity timestamp is the same as or is before the current time then the agent needs to take the appropriate action immediately.

Promise Statement: {{promise}}

Promise Details: {{promiseDetails}}

Having known the promise, you are to advise the AI agent to pick **a list of actions**. The actions are to be chosen only from the following list of available actions. Additionally, you need to generate a Description containing specific details of the action such that the agent knows how to exactly perform the action to fulfil the exact promise.

{{actions}}

{{providers}}

Response format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "degen-spartan-ai", "text": "string", "actions": "string[]", "reason": string }
\`\`\`

Where:
1) text: The Description containing specific details of the action.
2) actions: If the AI agent were to do nothing, output an empty array, otherwise output the chosen list of actions. Output this as a list of strings, which contains your recommended action(s). 
3) "reason":  A reason for the chosen action

**Out put the JSON File only**`;

// Prompt 2
export const extractGoalMessageTemplate = `

An AI agent called {{agentName}} has to accomplish an Instruction given to the AI agent through making a deal with a Counterparty. Your task is to generate and describe the two components of the deal: the Ask and the Promise.

The Ask is the AI agent’s request to the Counterparty in order for the AI agent to accomplish the Instruction. The Ask should be described in a few sentences detailing one specific action that the Counterparty needs to take. The action should be quantitatively measurable such that the action completion can be objectively evaluated, and must have an exact deadline.

The Promise is an interesting and reasonable future compensation to the Counterparty for completing the Ask. The Promise should be described in a few sentences detailing one specific action that the AI agent will need to take. The action  should be quantitatively measurable such that the action completion can be objectively evaluated, and must have an exact deadline.

For the Ask, if the user has not specified a specific chain, then choose **one** chain from below to facilitate your transaction. Otherwise, the transaction will take place at the user specified chain.

For the Promise, always choose one chain from the supported list below — regardless of what chain is mentioned in the instruction. The Promise chain must be independently selected from this list only. Never use the chain from the instruction for the Promise unless it also appears in the supported list.

Here are the chains:
{{allChains}}

Instruction: {{instruction}}

{{providers}}

Response format should be formatted in a JSON block like this:
\`\`\`json
{ “user”: shinichiagent, "ask": “string ", "promise": "string", "type": "string" }
\`\`\`


Where:
“ask”: The description of the Ask. **Always add your EVM wallet address if mentioned and there are any transactions. Include timestamps**
“promise”: The description of the Promise. **Include timestamps here**
"type": A one word description to categorize the instruction, output in capital letters.

**Out put the JSON File only**
`;
