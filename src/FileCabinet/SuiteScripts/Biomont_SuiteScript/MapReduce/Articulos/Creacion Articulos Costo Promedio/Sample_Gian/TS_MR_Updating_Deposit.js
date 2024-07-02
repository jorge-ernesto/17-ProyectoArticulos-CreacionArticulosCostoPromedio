/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
*/
define(['N/runtime', 'N/log', 'N/record', 'N/search'],
    function (runtime, log, record, search) {
        var currentScript = runtime.getCurrentScript();

        const getInputData = () => {
            try {
                let scriptParameters = getScriptParameters();
                log.error("getScriptParameters", scriptParameters);
                let depositsToUpdate = getDepositsToUpdate(scriptParameters);
                return depositsToUpdate;
            } catch (error) {
                log.error("error", error);
            }
        }

        const getScriptParameters = () => {
            let parameters = {};
            parameters.correlativeIdToAllocate = currentScript.getParameter("custscript_ts_mr_allocate_correlative") || "";
            parameters.correlativeIdToDeallocate = currentScript.getParameter("custscript_ts_mr_deallocate_correlative") || "";
            log.error("parameters", parameters)
            return parameters;
        }

        const getDepositsToUpdate = (scriptParameters) => {
            let depositsArray = [];
            let allocateCorrelatives = scriptParameters.correlativeIdToAllocate != "" ? scriptParameters.correlativeIdToAllocate.split(',') : [];
            let deallocateCorrelatives = scriptParameters.correlativeIdToDeallocate != "" ? scriptParameters.correlativeIdToDeallocate.split(',') : [];

            if (allocateCorrelatives.length > 0 || deallocateCorrelatives.length > 0) {
                let correlatives = allocateCorrelatives.concat(deallocateCorrelatives);
                log.error("correlatives", correlatives);
                let resultSearch = search.create({
                    type: search.Type.TRANSACTION,
                    filters: [
                        ["type","anyof","Deposit"],
                        "AND",
                        ["mainline", 'is', 'T'],
                        "AND", 
                        ["custbody_pe_number_er","anyof", correlatives] 
                     ],
                    columns: ["custbody_pe_number_er"]
                }).run().getRange(0, 1000);
            
                for (let i = 0; i < resultSearch.length; i++) {
                    let correlative = resultSearch[i].getValue('custbody_pe_number_er');
                    let deposit = {
                        internalId: resultSearch[i].id
                    };
                    if (allocateCorrelatives.indexOf(correlative) > -1) {
                        deposit.operation = 'allocate';
                    } else if (deallocateCorrelatives.indexOf(correlative) > -1) {
                        deposit.operation = 'deallocate';
                    }
                    depositsArray.push(deposit);
                }
            }
            return depositsArray;
        }

        const map = (context) => {
            log.error("map", "map");
            let deposit = JSON.parse(context.value);
            try {
                
                let journalId = currentScript.getParameter("custscript_ts_mr_journal");
                if (!deposit.internalId) {
                    log.error("El depósito no tiene Id");
                    return;
                }

                log.error("deposit", deposit);
                log.error("journal", journalId);
                let values = {}
                if (deposit.operation == 'allocate') {
                    values.custbody_ps_asiento_relacionado = journalId;
                } else if (deposit.operation == 'deallocate') {
                    values.custbody_ps_asiento_relacionado = '';
                } else return;

                record.submitFields({
                    type: record.Type.DEPOSIT,
                    id: deposit.internalId,
                    values,
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            } catch (error) {
                log.error("Error in [Map] function", error);
            }
        }

        return {
            getInputData,
            map
        }
    })