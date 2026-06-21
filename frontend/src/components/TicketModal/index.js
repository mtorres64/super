import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import TicketModalView from './TicketModalView';
import { printDocumentA4 } from '../../utils/printA4';

const TicketModal = (props) => {
  const { sale, customerOverride, config, afipConfig, cajeroName, returns = [] } = props;
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (customerOverride !== undefined) { setCustomer(customerOverride); return; }
    if (!sale?.cliente_id) { setCustomer(null); return; }
    axios.get(`${API}/customers/${sale.cliente_id}`)
      .then(r => setCustomer(r.data))
      .catch(() => setCustomer(null));
  }, [sale?.cliente_id, customerOverride]);

  const effectiveOnPrint = config?.receipt_format === 'a4'
    ? () => printDocumentA4(sale, { config, afipConfig, cajeroName, customer, returns })
    : props.onPrint;

  return <TicketModalView {...props} customer={customer} onPrint={effectiveOnPrint} />;
};

export default TicketModal;
