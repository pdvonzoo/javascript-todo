const todosList = {
    todos : [],
    id : 1,
    add({name, tag}, id, undo){
        let error = errorCheck.isAddError(name, 'name'), lastData;
        if(error){
            console.log(error);
            return;
        }
        this.todos.push({
            name: name,
            tag: tag,
            id: id || this.id,
            status : 'todo'
        });
        lastData = this.todos.slice(-1).pop();
        todoMessage.showActiveMessage(['add', lastData.id, name]);
        
        if(undo) {
            getLog.undoLogList({
                active: 'add',
                id: lastData.id,
                tag: lastData.tag
            });
        } else {
            getLog.makeLogList({
                active: 'add', 
                id: lastData.id, 
                tag: lastData.tag
            });
        }
        this.id++;
    },
    remove({id}, undo){
        let prev_data = getData.getPrevData(id),
            error = errorCheck.isSameId('remove', id);
        if(error){
            console.log(error);
            return;
        }
        this.todos = this.todos.filter((target)=>target.id !== id);
        todoMessage.showActiveMessage(['remove' ,id , prev_data.name, prev_data.status], undo);
        
        if(undo){
            getLog.undoLogList({
                active : 'remove',
                id : id,
                name: prev_data.name,
                tag: prev_data.tag
            });
        } else {
            getLog.makeLogList({
                active : 'remove', 
                id : id, 
                name: prev_data.name, 
                tag: prev_data.tag
            });
        }
    },
    update({id,  nextstatus}, undo){
        let prev_data = getData.getPrevData(id),
            error = errorCheck.isUpdateError(prev_data, nextstatus, id) || errorCheck.isSameId('update', id);
            nextstatus = nextstatus.toLowerCase();
        if(error){
            console.log(error);
            return;
        }
        for(let o of this.todos){
            if(o.id === id) {
                if(nextstatus === 'doing'){ o.startTime = stopWatch.start(); }
                if(nextstatus === 'done' && o.startTime){ o.elapsedTime = stopWatch.stop(o.startTime); }
                o.status = nextstatus;
            }
        };
        todoMessage.showActiveMessage(['update' ,id ,prev_data.name, prev_data.status, nextstatus]);
        
        if(undo){
            getLog.undoLogList({
                active : 'update',
                id : id,
                name: prev_data.name,
                tag: prev_data.tag,
                prevStatus: prev_data.status,
                nextStatus: nextstatus
            });
        } else {
            getLog.makeLogList({
                active : 'update',
                id : id,
                name: prev_data.name,
                tag: prev_data.tag,
                prevStatus: prev_data.status,
                nextStatus: nextstatus
            });
        }
    },
    showTag(tagName){
        let requiredData = getData.getRequiredData(this.todos, 'tag', tagName);
        getData.getPrintFormat(requiredData, 'status');
    },
    showTags(){
        let requiredData = getData.getRequiredData(this.todos, 'tag');
        getData.getPrintFormat(requiredData, 'tag');
    },
    show(status){
        let requiredData = getData.getRequiredData(this.todos, 'status', status);
        getData.getPrintFormat(requiredData, status);
    },
    showAll(){
        let requiredData = getData.getRequiredData(this.todos, 'status');
        getData.getPrintFormat(requiredData, 'status', 'async');
    },
    undo(){
        if(getLog.undoCounter > 2){
            console.log('undo는 최대 3회 할 수 있습니다.');
            return;
        }
        getLog.increaseUndoLogCounter();
        let lastData = getLog.todoslog.pop();
        console.log(lastData);
        if(lastData.active === 'add'){
            this.remove({id : lastData.id}, 'undo');
        }
        if(lastData.active === 'remove'){
            this.add({name : lastData.name, tag : lastData.tag}, lastData.id, 'undo');
        }
        if(lastData.active === 'update'){
            this.update({id : lastData.id, nextstatus : lastData.prevStatus}, 'undo');
        }
    },
    redo(){
        if(getLog.undoCounter < 1){
            console.log('undo가 한 번도 실행되지 않았습니다.');
            return;
        }
        getLog.decreaseUndoLogCounter();
        let lastData = getLog.undoLog.pop();

        if(lastData.active === 'add'){
            this.remove({id : lastData.id});
        }
        if(lastData.active === 'remove'){
            this.add({name : lastData.name, tag : lastData.tag}, lastData.id);
        }
        if(lastData.active === 'update'){
            this.update({id : lastData.id, nextstatus : lastData.prevStatus});
        }
    },  
};

const errorCheck = {
    isAddError(name, key){
        let error_check = [];
        error_check = todosList.todos.filter((v) => v[key] === name);
        return this.getErrorMessage('add', error_check.pop());
    },
    isUpdateError(prevData, nextStatus, id){
        let error_check;
        if(prevData.status === nextStatus){
            error_check = 'same';
        }
        if(prevData.status === 'done' && nextStatus === 'doing'){
            error_check = 'reverse';
        }
        if(prevData.status === 'todo' && nextStatus === 'done'){
            error_check = 'jump';
        }
        return this.getErrorMessage('update', error_check, id, prevData, nextStatus);
    },
    isSameId(active, id){
        let error_check = false;
        let sameId = [];
        if(active === 'remove' || active === 'update'){
            sameId = todosList.todos.filter((v) => v.id === id).pop();
        }
        if(!sameId){
            error_check = true;
        }
        return this.getErrorMessage('remove', error_check, id);
    },
    getErrorMessage(active, error_check, id, prevData, nextStatus){
        
        let error = '';
        if(active === 'add' && error_check){ 
            error = '[error] todo에는 이미 같은 이름의 task가 존재합니다. ';
        }
        if(active === 'remove' && error_check|| active === 'update' && error_check){
            error = `[error] ${id} 아이디는 존재하지 않습니다.`;
        }
        if(active === 'update'){
            error = (error_check === 'same')? `[error] ${id}번은 이미 ${nextStatus}입니다.`:
                    (error_check === 'reverse')? `[error] ${prevData.status} 상태에서 ${nextStatus}상태로 갈 수 없습니다. `:
                    (error_check === 'jump')? `[error] ${prevData.status}상태에서 바로 ${nextStatus}를 실행할 수 없습니다.`:'';
        }
        return error;
    },
}

const todoMessage = {
    showActiveMessage([activeType, id, name, status,update_status], undo){
        (activeType === 'add') ? console.log(`id: ${id} ${name}항목이 새로 추가되었습니다.`) :
        (activeType === 'remove' && !undo) ? console.log(`id:${id}, ${name} 삭제완료.`) :
        (activeType === 'remove' && undo) ? console.log(`${id}번, ${name}가 삭제됐습니다`) :
        (activeType === 'update') ? console.log(`id:${id}, "${name}" 항목이 ${status} => ${update_status} 상태로 업데이트 됐습니다.`) :
        '';
        let statusCount = getData.getCurrentStatus(todosList.todos, 'status');
        console.log(`현재상태 :  todo:${statusCount.todo}개, doing:${statusCount.doing}개, done:${statusCount.done}개`);
    },
    showMessage(requiredValueObj, countObj){
        for(let value in requiredValueObj){
            if(value !== 'undefined'){
                console.log(`[ ${value} , 총${countObj[value]}개 ]`);
            }
            console.log(`${requiredValueObj[value]}`);
        }
    },
    showAsyncMessage(noticeArr, index=0){
            (function playLoop() {
            if(index > 2) return;
            console.log(noticeArr[index].notice);
            setTimeout(function() {
                console.log(noticeArr[index].title);
                console.log(noticeArr[index].list);
                index++; 
                playLoop();
            }, noticeArr[index].sec);    
        })();
    },
}

const getData = {
    getPrevData(id){
        let prev_data = {
            name: '', 
            id: 0
        };
        for(let o of todosList.todos){
            if(o.id === id){
                prev_data.name = o.name;
                prev_data.status = o.status;
                prev_data.id = o.id;
            }
        };
        
        return prev_data;
    },
    getCurrentData(id){
        let prev_data = {
            name: '', 
            id: 0
        };
        for(let o of todosList.todos){
            if(o.id === id){
                prev_data.name = o.name;
                prev_data.status = o.status;
                prev_data.id = o.id;
            }
        };
        return prev_data;
    },
    getCurrentStatus(data, valueType){
        const countObj =  getData.getDefaultData(todosList.todos, valueType);
        data.forEach((v)=> {
            ++countObj[v[valueType]];
        });
        return countObj;
    },
    getDefaultData(todosList, valueType){
        let countObj = (valueType === 'status') ? {todo: 0, doing: 0, done: 0} : {};
        todosList.forEach((target)=> {
            countObj[target[valueType]] = 0;
        });
        return countObj;
    },
    getRequiredData(data, kind, value){
        let requiredData = [];
        let fixedData = (value)? data.filter((v) => v[kind] === value) : data;
        fixedData.forEach((v) => {
            requiredData.push(v);
        })
        return requiredData;
    },
    getPrintList(inputData, key ,requiredValueObj){
        inputData.reduce((acc, curr) => {
            requiredValueObj[curr[key]] += 
            `-${curr.id}번, ${curr.name} ${(curr.status === 'done')? curr.elapsedTime+' msec':''} \n`;
            return curr;
        }, requiredValueObj);
        return requiredValueObj;
    },
    getPrintFormat(inputData, key, asyncCheck){
        let countObj = this.getCurrentStatus(inputData, key);
        let requiredValueObj = {};
        for(let value in countObj){
            requiredValueObj[value] = '';
        }
        requiredValueObj = this.getPrintList(inputData, key, requiredValueObj)
        if(asyncCheck){this.getAsyncData(requiredValueObj, countObj, inputData)}
        else{todoMessage.showMessage(requiredValueObj, countObj)}
    },
    getAsyncData(requiredValueObj, countObj){
        let numOfData = this.getCounter();
        let noticeArr = []
        for(let value in requiredValueObj){
            noticeArr.push({
                value,
                title : `[ ${value} , 총${countObj[value]}개 ]`,
                list  : `${requiredValueObj[value]}`,
            })
        }
        this.getAsyncTime(noticeArr, numOfData);
    },
    getCounter(countObj){
        let numOfData = 0;
        for(let value in countObj){
            numOfData += +countObj[value];
        }
        return numOfData;
    },
    getAsyncTime(noticeArr, numOfData){
        const valueAsyncTime = {
            todo: 2000,
            doing: 3000,
            done: 2000
        }
        for(let obj of noticeArr){
            obj.sec =   valueAsyncTime[obj.value];
        }
        this.getAsyncNotice(noticeArr, numOfData)
    },
    getAsyncNotice(noticeArr, numOfData){
        for(let obj of noticeArr){
            obj.notice =   (obj.value === 'todo') ? `총 ${numOfData}개의 리스트를 가져왔습니다. ${obj.sec/1000}초뒤에 ${obj.value}내역을 출력합니다.....`:
                           (obj.value === 'doing')? `지금부터 ${obj.sec/1000}초뒤에 ${obj.value}내역을 출력합니다....`:
                           (obj.value === 'done') ? `지금부터 ${obj.sec/1000}초뒤에 ${obj.value}내역을 출력합니다.....`: '';
        }
        todoMessage.showAsyncMessage(noticeArr);
    }
}

const getLog  = {
    undoCounter : 0,
    redoCounter : 0,
    todoslog : [],
    undoLog  : [],
    makeLogList({active, id, name, tag,status, prevStatus, nextStatus}){
        this.todoslog.push({
            active,
            id,
            name,
            status,
            tag,
            prevStatus,
            nextStatus
        })
    },
    undoLogList({active, id, name, tag,status, prevStatus, nextStatus}){
        this.undoLog.push({
            active,
            id,
            name,
            status,
            tag,
            prevStatus,
            nextStatus
        })
    },
    increaseUndoLogCounter(){
        this.undoCounter++;
    },
    decreaseUndoLogCounter(){
        this.undoCounter--;
    },
}

const stopWatch = {
    start(){
        return new Date().getTime();
    },
    stop(start){
        return new Date().getTime() - start;
    }
}

todosList.add({name: "자바스크립트", tag:"study"});
todosList.add({name: "자바스크립트 공부하기", tag:"study"});
todosList.add({name: "ios 공부하기", tag:"programming"});
// todosList.remove({id:1});
todosList.undo();
todosList.undo();
todosList.undo();
todosList.redo();
todosList.redo();
todosList.redo();

// todosList.remove({id:1});
// todosList.update({id:1,  nextstatus:"doing"});
// todosList.undo();
// todosList.update({id:1,  nextstatus:"done"});
// todosList.update({id:1,  nextstatus:"doing"});

// todosList.update({id:2,  nextstatus:"done"});
// todosList.update({id:1,  nextstatus:"doing"});



// todosList.add({name: "OS 공부하기", tag:"programming"});
// todosList.update({id:1,  nextstatus:"done"});
// todosList.remove({id:1});
// todosList.add({name: "OS 공부하기", tag:"programming"});
// todosList.update({id:3,  nextstatus:"doing"});
// todosList.update({id:4,  nextstatus:"done"});
// todosList.add({name: "여행가기", tag:"play"});
// todosList.add({name: "OS", tag:"programming"});
// todosList.update({id:3,  nextstatus:"done"});
// todosList.add({name: "ios", tag:"programming"});


// todosList.showTag("programming");
// todosList.showTags();
// todosList.show('todo');
// todosList.showAll();


// 잘못된 입력을 분석해서 에러메시지를 출력해서 올바른 값을 사용할 수 있게 돕는다.
// 실행한 값을 되돌려주는 undo/redo를 지원한다.
// undo/redo는 3단계까지 지원한다. (undo -> undo -> undo -> redo -> redo -> redo)
// 객체를 역할별로 추가해서 만들고, 객체간의 협력을 하도록 구현한다.