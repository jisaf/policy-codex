y=copy.deepcopy(byid['CO-04']); y['id']='X-NOSTART'; y['expect']={}
del y['persons']['p1']['facts']['pregnancy_start_date']
out.append(y)
